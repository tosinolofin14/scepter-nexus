document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileBtns = document.querySelectorAll('.mobile-menu-btn');

    mobileBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentNavContainer = e.target.closest('.nav-container');
            const currentNavLinks = currentNavContainer.querySelector('.nav-links');
            
            const isExpanded = btn.classList.contains('active');
            btn.setAttribute('aria-expanded', !isExpanded);
            
            btn.classList.toggle('active');
            if (currentNavLinks) {
                currentNavLinks.classList.toggle('active');
            }
            document.body.style.overflow = isExpanded ? '' : 'hidden'; // Prevent scrolling when menu open
        });
    });
    
    // Dropdown toggles for mobile
    const dropdowns = document.querySelectorAll('.dropdown > a');
    dropdowns.forEach(dropdownToggle => {
        dropdownToggle.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                dropdownToggle.parentElement.classList.toggle('active');
            }
        });
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
