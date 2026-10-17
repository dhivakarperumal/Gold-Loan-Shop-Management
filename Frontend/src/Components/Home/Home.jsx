import React from 'react'
import Category from './Category'
import Products from './Products'
import Hero from './Hero'
import Banner from './Banner'


const Home = () => {
  return (
    <div>
    <Hero/>
    <Category />
    <Banner />
    <Products/>
    </div>
  )
}

export default Home
