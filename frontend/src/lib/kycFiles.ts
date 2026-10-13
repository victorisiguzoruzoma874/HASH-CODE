const MAX_IMAGE_BYTES = 3_000_000

function readBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Could not read the file. Please select it again.'))
    reader.readAsDataURL(file)
  })
}

export async function prepareKycImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Choose a JPEG or PNG image.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => { throw new Error('Could not open this image. Choose a valid JPEG or PNG.') })
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing is unavailable in this browser.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      result => result ? resolve(result) : reject(new Error('Could not process this image.')),
      'image/jpeg', 0.85,
    ))
    if (blob.size > MAX_IMAGE_BYTES) throw new Error('This image is too large after compression. Choose a smaller image.')
    return await readBase64(blob)
  } finally { URL.revokeObjectURL(url) }
}

export async function prepareAddressProof(file: File) {
  if (file.type === 'application/pdf') {
    return { base64: await readBase64(file), mime: 'application/pdf' as const }
  }
  return { base64: await prepareKycImage(file), mime: 'image/jpeg' as const }
}
