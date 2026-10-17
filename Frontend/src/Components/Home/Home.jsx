import React, { useEffect, useState } from 'react'
import api from '../../api'
import Category from './Category'
import Hero from './Hero'
import Banner from './Banner'
import Silver from './Silver'
import Diamond from './Diamond'
import Gold from './Gold'


const Home = () => {
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const fetchProducts = async () => {
      try {
        const response = await api.get('/products', {
          params: { page: 1, limit: 100, search: '', status: 'Active' },
          signal: controller.signal,
        })

        if (!Array.isArray(response.data?.products)) {
          throw new TypeError('The products response must contain a products array')
        }

        setProducts(response.data.products)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to fetch home products:', error)
          setProductsError(true)
        }
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false)
      }
    }

    fetchProducts()
    return () => controller.abort()
  }, [])

  const isDiamondProduct = (product) =>
    [product.name, product.category, product.subcategory, product.metal_type]
      .some((value) => String(value || '').toLowerCase().includes('diamond'))
  const goldProducts = products.filter(
    (product) => product.metal_type?.toLowerCase().includes('gold') && !isDiamondProduct(product)
  )
  const silverProducts = products.filter((product) =>
    product.metal_type?.toLowerCase().includes('silver')
  )
  const diamondProducts = products.filter(isDiamondProduct)

  return (
    <div>
      <Hero />
      <Category />
      <Banner />
      <Gold products={goldProducts} loading={productsLoading} error={productsError} />
      <Silver products={silverProducts} loading={productsLoading} error={productsError} />
      <Diamond products={diamondProducts} loading={productsLoading} error={productsError} />
    </div>
  )
}

export default Home
