const vnd = new Intl.NumberFormat('vi-VN')

export const formatPrice = (value) => `${vnd.format(value)}₫`

// CDN của hsv-tech resize theo tiền tố "{w}x0/" ngay sau domain
const HSV_HOST = 'https://image.hsv-tech.io/'
export function sizedImage(url, width = 300) {
  if (!url) return '/images/logo-mark.png'
  return url.startsWith(HSV_HOST) ? url.replace(HSV_HOST, `${HSV_HOST}${width}x0/`) : url
}
