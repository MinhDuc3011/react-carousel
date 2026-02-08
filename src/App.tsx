import './App.css'
import Carousel from './components/Carousel/Carousel'
import { carouselItems } from './data/carousel.mock'

function App() {
  return (
    <div className="app-container">
      <h1 className="app-title">Interactive Carousel</h1>
      <Carousel items={carouselItems} />
    </div>
  )
}

export default App
