import { formatCurrency } from "../../utils/currency";

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:5000'
).replace(/\/$/, '')

export const getProductImageUrl = (product) => {
  const variantImage = product.variants?.find(
    (variant) => Array.isArray(variant.images) && variant.images.length > 0
  )?.images[0]
  const image = variantImage || product.images?.[0]

  if (!image || typeof image !== 'string') return ''
  if (/^(https?:|data:|blob:)/i.test(image)) return image
  return `${backendUrl}${image.startsWith('/') ? image : `/${image}`}`
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
