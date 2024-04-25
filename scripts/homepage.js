function showSlide(n) {
    const slides = document.querySelectorAll(".mySlides");
    slides.forEach((slide, index) => {
      if (index === n) {
        slide.style.display = "block";
      } else {
        slide.style.display = "none";
      }
    });
  }
  
  function nextSlide() {
    const slides = document.querySelectorAll(".mySlides");
    let currentIndex = -1;
    slides.forEach((slide, index) => {
      if (slide.style.display === "block") {
        currentIndex = index;
        slide.style.display = "none";
      }
    });
    if (currentIndex === slides.length - 1) {
      showSlide(0);
    } else {
      showSlide(currentIndex + 1);
    }
  }
  
  function prevSlide() {
    const slides = document.querySelectorAll(".mySlides");
    let currentIndex = -1;
    slides.forEach((slide, index) => {
      if (slide.style.display === "block") {
        currentIndex = index;
        slide.style.display = "none";
      }
    });
    if (currentIndex === 0) {
      showSlide(slides.length - 1);
    } else {
      showSlide(currentIndex - 1);
    }
  }
  
  document.querySelectorAll(".prev").forEach((prev) => {
    prev.addEventListener("click", () => {
      prevSlide();
    });
  });
  
  document.querySelectorAll(".next").forEach((next) => {
    next.addEventListener("click", () => {
      nextSlide();
    });
  });
  
  document.addEventListener("DOMContentLoaded", () => {
    showSlide(0);
  });
  