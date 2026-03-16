document.addEventListener('DOMContentLoaded', () => {
    
    // Number Counting Animation Strategy (Fintech Feel)
    const animateValue = (obj, start, end, duration, formatStr = "", isCurrency = false) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Easing function for smooth deceleration
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            
            let currentVal = progress * (end - start) + start;
            if (easeOutQuart > 0) {
               currentVal = easeOutQuart * (end - start) + start;
            }

            let formatted = Math.floor(currentVal).toLocaleString();
            
            if (isCurrency) {
                 formatted = '$' + formatted;
            }
            if (formatStr) {
                formatted = formatted + formatStr;
            }

            obj.innerHTML = formatted;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                 // Ensure final value is exact
                 let finalStr = end.toLocaleString();
                 if (isCurrency) finalStr = '$' + finalStr;
                 obj.innerHTML = finalStr + formatStr;
            }
        };
        window.requestAnimationFrame(step);
    };

    // Observers for stats to count up when visible
    const statObserverOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    const statObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValueText = target.getAttribute('data-value') || target.innerText;
                
                // Parse the final value (remove symbols and commas)
                let numStr = finalValueText.replace(/[^0-9.]/g, '');
                let endValue = parseFloat(numStr);
                
                let isCurrency = finalValueText.includes('$');
                let formatStr = '';
                if (finalValueText.includes('%')) formatStr = '%';
                if (finalValueText.includes('M')) formatStr = 'M';
                if (finalValueText.includes('k')) formatStr = 'k';

                if (!isNaN(endValue)) {
                    animateValue(target, 0, endValue, 2000, formatStr, isCurrency);
                }
                
                observer.unobserve(target);
            }
        });
    }, statObserverOptions);

    // Apply observer to specific elements
    // Look for classes like stat-value or custom ones
    document.querySelectorAll('.stat-value, .cs-metric-val, .stat-highlight h3, .text-3xl.font-bold, .text-5xl.font-heading').forEach(el => {
        if(el.innerText && el.innerText.match(/\d/)) {
            // Only animate if it looks like a number
            statObserver.observe(el);
        }
    });

});
