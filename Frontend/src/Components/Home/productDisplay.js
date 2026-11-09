import { formatCurrency } from "../../utils/currency";

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
  ''
).trim().replace(/\/$/, '')
const localBackendUrlPattern =
  /^(?:https?:)?\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?=\/|$)/i

export const resolveBackendImageUrl = (image) => {
  if (!image || /^(data:|blob:)/i.test(image)) return image

  if (/^(https?:)?\/\//i.test(image)) {
    if (backendUrl && localBackendUrlPattern.test(image)) {
      return image.replace(localBackendUrlPattern, backendUrl)
    }
    return image
  }

  return backendUrl
    ? `${backendUrl}${image.startsWith('/') ? image : `/${image}`}`
    : image
}

export const getProductImageUrl = (product) => {
  const imageSource = (image) => {
    if (typeof image === 'string') return image.trim()
    if (image && typeof image === 'object' && !Array.isArray(image)) {
      return imageSource(image.url || image.path || image.src)
    }
    return ''
  }
  const imageList = (images) => {
    if (Array.isArray(images)) return images
    if (typeof images === 'string' && images.trim()) {
      try {
        const parsed = JSON.parse(images)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return [images]
      }
    }
    return []
  }
  const firstImage = (images) => imageList(images).map(imageSource).find(Boolean) || ''
  const variantImage = imageList(product?.variants)
    .map((variant) => firstImage(variant?.images))
    .find(Boolean)
  const image = variantImage || firstImage(product?.images)

  if (!image) return ''
  return resolveBackendImageUrl(image)
}

export const formatProductPrice = (product) => {
  const price = Number(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0)
  return formatCurrency(price)
}

export const getProductDetails = (product) => {
  const details = [product.purity || product.metal_type]
  if (product.gross_weight) details.push(`${Number(product.gross_weight)} g`)
  return details.filter(Boolean).join(' · ')
}
