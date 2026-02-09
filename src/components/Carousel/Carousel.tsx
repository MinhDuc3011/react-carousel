import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { MouseEvent, TouchEvent } from 'react'
import './Carousel.css'
import CarouselSlide from './CarouselSlide'
import { SLIDE_WIDTH, CLONE_COUNT, AUTO_SLIDE_INTERVAL } from './config/carousel.constants'
import type { CarouselItem, CarouselProps } from './config/carousel.types'

/**
 * Component
 */

const Carousel: React.FC<CarouselProps> = ({ items }) => {
  // Clone items for infinite loop
  const clonedItems: CarouselItem[] = [
    ...items.slice(-CLONE_COUNT),
    ...items,
    ...items.slice(0, CLONE_COUNT)
  ]

  // State
  const [currentIndex, setCurrentIndex] = useState<number>(CLONE_COUNT)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [hasMoved, setHasMoved] = useState<boolean>(false)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false)

  // Refs
  const startX = useRef<number>(0)
  const currentTranslate = useRef<number>(0)
  const prevTranslate = useRef<number>(0)
  const autoSlideTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef<boolean>(false)
  const currentIndexRef = useRef<number>(CLONE_COUNT)
  const slideWidthRef = useRef<number>(SLIDE_WIDTH)

  // Get dynamic slide width
  const getSlideWidth = useCallback(() => {
    if (trackRef.current) {
      const firstSlide = trackRef.current.firstElementChild as HTMLElement
      if (firstSlide) {
        return firstSlide.offsetWidth
      }
    }
    return SLIDE_WIDTH
  }, [])

  /**
   * Auto slide
   */

  const nextSlide = useCallback(() => {
    if (isDraggingRef.current || isTransitioning) return

    setIsTransitioning(true)
    const next = currentIndexRef.current + 1
    currentIndexRef.current = next
    setCurrentIndex(next)
    const slideWidth = getSlideWidth()
    currentTranslate.current = -next * slideWidth
    prevTranslate.current = currentTranslate.current
  }, [isTransitioning, getSlideWidth])

  const startAutoSlide = useCallback(() => {
    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current)
    autoSlideTimer.current = setInterval(nextSlide, AUTO_SLIDE_INTERVAL)
  }, [nextSlide])

  const stopAutoSlide = useCallback(() => {
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current)
      autoSlideTimer.current = null
    }
  }, [])

  /**
   * Infinite loop handling
   */

  const handleTransitionEnd = useCallback(() => {
    setIsTransitioning(false)
    if (!trackRef.current) return

    const slideWidth = getSlideWidth()

    if (currentIndexRef.current >= items.length + CLONE_COUNT) {
      const realIndex = CLONE_COUNT + (currentIndexRef.current - items.length - CLONE_COUNT)
      currentIndexRef.current = realIndex
      setCurrentIndex(realIndex)
      currentTranslate.current = -realIndex * slideWidth
    }

    if (currentIndexRef.current < CLONE_COUNT) {
      const realIndex = items.length + currentIndexRef.current
      currentIndexRef.current = realIndex
      setCurrentIndex(realIndex)
      currentTranslate.current = -realIndex * slideWidth
    }

    prevTranslate.current = currentTranslate.current
    trackRef.current.style.transition = 'none'
    trackRef.current.style.transform = `translateX(${currentTranslate.current}px)`
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    trackRef.current.offsetHeight
    trackRef.current.style.transition = ''
  }, [items.length, getSlideWidth])

  /**
   * Mouse events
   */

  const preventDefault = (e: Event) => e.preventDefault()

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (isTransitioning) {
      return
    }
    
    e.preventDefault()

    isDraggingRef.current = true
    setIsDragging(true)
    setHasMoved(false)
    startX.current = e.clientX
    stopAutoSlide()

    trackRef.current?.classList.remove('transitioning')
    document.addEventListener('mousemove', handleMouseMove)
    // eslint-disable-next-line react-hooks/immutability
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('selectstart', preventDefault)
  }

  const handleMouseMove = useCallback((e: MouseEvent | globalThis.MouseEvent) => {
    if (!isDraggingRef.current) return

    const currentX = e.clientX
    const deltaX = currentX - startX.current

    if (Math.abs(deltaX) > 5) setHasMoved(true)

    currentTranslate.current = prevTranslate.current + deltaX
    
    trackRef.current!.style.transform = `translateX(${currentTranslate.current}px)`
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return

    isDraggingRef.current = false
    setIsDragging(false)
    trackRef.current?.classList.add('transitioning')

    const deltaX = currentTranslate.current - prevTranslate.current
    const slideWidth = getSlideWidth()

    if (Math.abs(deltaX) >= 40) {
      const next = deltaX > 0 ? currentIndexRef.current - 1 : currentIndexRef.current + 1
      currentIndexRef.current = next
      setCurrentIndex(next)
      currentTranslate.current = -next * slideWidth
      setIsTransitioning(true)
    } else {
      currentTranslate.current = prevTranslate.current
    }

    trackRef.current!.style.transform = `translateX(${currentTranslate.current}px)`
    prevTranslate.current = currentTranslate.current

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('selectstart', preventDefault)

    startAutoSlide()
  }, [handleMouseMove, startAutoSlide, getSlideWidth])

  /**
   * Touch events
   */

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (isTransitioning) {
      return
    }
    
    isDraggingRef.current = true
    setIsDragging(true)
    setHasMoved(false)
    startX.current = e.touches[0].clientX
    stopAutoSlide()
    trackRef.current?.classList.remove('transitioning')
  }

  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return

      const currentX = e.touches[0].clientX
      const deltaX = currentX - startX.current

      if (Math.abs(deltaX) > 5) setHasMoved(true)

      currentTranslate.current = prevTranslate.current + deltaX
      trackRef.current!.style.transform = `translateX(${currentTranslate.current}px)`
    },
    []
  )

  const handleTouchEnd = useCallback(() => {
    handleMouseUp()
  }, [handleMouseUp])

  /**
   * Click
   */

  const handleSlideClick = (landingPage?: string) => {
    if (hasMoved || !landingPage) return
    window.open(landingPage, '_blank')
  }

  /**
   * Effects
   */

  useEffect(() => {
    startAutoSlide()
    return () => stopAutoSlide()
  }, [startAutoSlide, stopAutoSlide])

  useEffect(() => {
    if (!isDraggingRef.current) {
      currentIndexRef.current = currentIndex
      const slideWidth = getSlideWidth()
      currentTranslate.current = -currentIndex * slideWidth
      prevTranslate.current = currentTranslate.current
      trackRef.current!.style.transform = `translateX(${currentTranslate.current}px)`
    }
  }, [currentIndex, getSlideWidth])

  // Initialize position on mount and resize
  useEffect(() => {
    const updatePosition = () => {
      const slideWidth = getSlideWidth()
      slideWidthRef.current = slideWidth
      currentTranslate.current = -currentIndexRef.current * slideWidth
      prevTranslate.current = currentTranslate.current
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${currentTranslate.current}px)`
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [getSlideWidth])

  /**
   * Render
   */

  return (
    <div className="carousel-container">
      <div
        className={`carousel ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={stopAutoSlide}
        onMouseLeave={startAutoSlide}
      >
        <div
          ref={trackRef}
          className="carousel-track transitioning"
          onTransitionEnd={handleTransitionEnd}
        >
          {clonedItems.map((item, index) => (
            <CarouselSlide
              key={`${item.id}-${index}`}
              item={item}
              onClick={handleSlideClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Carousel
