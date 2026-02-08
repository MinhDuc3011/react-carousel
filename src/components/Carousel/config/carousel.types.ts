export type CarouselItem = {
  id: number
  title: string
  image: string
  landing_page?: string
}

export type CarouselProps = {
  items: CarouselItem[]
}
