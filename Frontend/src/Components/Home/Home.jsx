import React from 'react'
import Category from './Category'
import Products from './Products'
import Hero from './Hero'
import Banner from './Banner'
import Silver from './Silver'
import Diamond from './Diamond'
import Gold from './Gold'


const Home = () => {
  return (
    <div>
    <Hero/>
    <Category />
    <Banner />
    <Gold/>
    <Products/>
    <Diamond />
    <Silver />
    </div>
  )
}

export default Home
