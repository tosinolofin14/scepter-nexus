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

    // Global Toast System
    window.showToast = function(message, isError = true) {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.top = '24px';
            toastContainer.style.right = '24px';
            toastContainer.style.zIndex = '9999';
            toastContainer.style.display = 'flex';
            toastContainer.style.flexDirection = 'column';
            toastContainer.style.gap = '12px';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.style.background = isError ? '#DC2626' : '#1A7A5E';
        toast.style.color = '#ffffff';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.fontFamily = "'Inter', sans-serif";
        toast.style.fontSize = '14px';
        toast.style.fontWeight = '500';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        toast.textContent = message;

        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };

    // Global interception to show Toast on fetch errors generically
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch(...args);
            if (!response.ok && response.url.includes('/api/')) {
                try {
                    const cloned = response.clone();
                    const data = await cloned.json();
                    if (data.error) window.showToast(data.error, true);
                } catch {
                    window.showToast(`Error ${response.status}: Failed to communicate with server`, true);
                }
            }
            return response;
        } catch (error) {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('/api/')) {
                window.showToast("Network Error: Unable to connect to backend.", true);
            }
            throw error;
        }
    };
});
