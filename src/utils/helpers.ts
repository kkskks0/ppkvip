export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('zh-CN')
}

export function compressImage(file: File, maxWidth = 800, quality = 0.5): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality)
    }

    img.src = URL.createObjectURL(file)
  })
}
