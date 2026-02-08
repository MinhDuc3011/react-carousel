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
  const currentTranslate = useRef<number>(-CLONE_COUNT * SLIDE_WIDTH)
  const prevTranslate = useRef<number>(-CLONE_COUNT * SLIDE_WIDTH)
  const autoSlideTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef<boolean>(false)

  /**
   * Auto slide
   */

  const nextSlide = useCallback(() => {
    if (isDraggingRef.current || isTransitioning) return

    setIsTransitioning(true)
    setCurrentIndex(prev => {
      const next = prev + 1
      currentTranslate.current = -next * SLIDE_WIDTH
      prevTranslate.current = currentTranslate.current
      return next
    })
  }, [isTransitioning])

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

    if (currentIndex >= items.length + CLONE_COUNT) {
      const realIndex =
        CLONE_COUNT + (currentIndex - items.length - CLONE_COUNT)

      setCurrentIndex(realIndex)
      currentTranslate.current = -realIndex * SLIDE_WIDTH
    }

    if (currentIndex < CLONE_COUNT) {
      const realIndex = items.length + currentIndex
      setCurrentIndex(realIndex)
      currentTranslate.current = -realIndex * SLIDE_WIDTH
    }

    prevTranslate.current = currentTranslate.current
    trackRef.current.style.transition = 'none'
    trackRef.current.style.transform = `translateX(${currentTranslate.current}px)`
    trackRef.current.offsetHeight
    trackRef.current.style.transition = ''
  }, [currentIndex, items.length])

  /**
   * Mouse events
   */

  const preventDefault = (e: Event) => e.preventDefault()

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault()

    isDraggingRef.current = true
    setIsDragging(true)
    setHasMoved(false)
    startX.current = e.clientX
    stopAutoSlide()

    trackRef.current?.classList.remove('transitioning')

    document.addEventListener('mousemove', handleMouseMove as any)
    document.addEventListener('mouseup', handleMouseUp as any)
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

    if (Math.abs(deltaX) >= 40) {
      setCurrentIndex(prev => {
        const next = deltaX > 0 ? prev - 1 : prev + 1
        currentTranslate.current = -next * SLIDE_WIDTH
        return next
      })
      setIsTransitioning(true)
    } else {
      currentTranslate.current = prevTranslate.current
    }

    trackRef.current!.style.transform = `translateX(${currentTranslate.current}px)`
    prevTranslate.current = currentTranslate.current

    document.removeEventListener('mousemove', handleMouseMove as any)
    document.removeEventListener('mouseup', handleMouseUp as any)
    document.removeEventListener('selectstart', preventDefault)

    startAutoSlide()
  }, [handleMouseMove, startAutoSlide])

  /**
   * Touch events
   */

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
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
      currentTranslate.current = -currentIndex * SLIDE_WIDTH
      prevTranslate.current = currentTranslate.current
      trackRef.current!.style.transform = `translateX(${currentTranslate.current}px)`
    }
  }, [currentIndex])

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
