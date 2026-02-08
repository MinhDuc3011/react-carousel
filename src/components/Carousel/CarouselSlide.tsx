import type { FC } from 'react'
import type { CarouselItem } from './config/carousel.types'

type CarouselSlideProps = {
  item: CarouselItem
  onClick?: (landingPage?: string) => void
}

const CarouselSlide: FC<CarouselSlideProps> = ({ item, onClick }) => {
  const handleClick = () => {
    if (!onClick) return
    onClick(item.landing_page)
  }

  return (
    <div className="carousel-slide" onClick={handleClick}>
      <img src={item.image} alt={item.title} />
      <div className="slide-title">{item.title}</div>
    </div>
  )
}

export default CarouselSlide