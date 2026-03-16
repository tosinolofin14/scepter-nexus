document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');

    mobileBtn?.addEventListener('click', () => {
        // Toggle active classes (would need CSS for actual mobile menu display)
        const isExpanded = mobileBtn.getAttribute('aria-expanded') === 'true';
        mobileBtn.setAttribute('aria-expanded', !isExpanded);
        
        // Simple toggle for demonstration (you'd normally add a class and style it in CSS)
        // navLinks.classList.toggle('active');
        // navActions.classList.toggle('active');
    });

    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Intersection Observer for scroll animations
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
    // FAQ Accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const isExpanded = question.getAttribute('aria-expanded') === 'true';
            
            // Close all other faqs
            faqQuestions.forEach(q => {
                q.setAttribute('aria-expanded', 'false');
                q.nextElementSibling.style.display = 'none';
                q.querySelector('.faq-icon').textContent = '+';
                q.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
            });

            // Toggle current if it wasn't expanded
            if (!isExpanded) {
                question.setAttribute('aria-expanded', 'true');
                question.nextElementSibling.style.display = 'block';
                // Animate showing
                question.nextElementSibling.style.animation = 'fadeInUp 0.3s ease-out forwards';
                question.querySelector('.faq-icon').style.transform = 'rotate(45deg)';
            }
        });
    });
});
