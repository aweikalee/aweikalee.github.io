(function() {
    const navbar = document.querySelector('.navbar-main')
    const body = document.documentElement || document.body
    if (!navbar || !body) return

    let MAX_SCROLLTOP = 0
    let MIN_SCROLLTOP = 0
    let oldScrollTop = 0

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll)

    function resize() {
        const h = window.innerHeight
        MAX_SCROLLTOP = h * 0.3
        MIN_SCROLLTOP = MAX_SCROLLTOP * 0.5
        oldScrollTop = 0
        onScroll()
    }

    function onScroll() {
        const scrollTop = body.scrollTop
        if (scrollTop < MAX_SCROLLTOP) {
            const opacity = Math.max((scrollTop - MIN_SCROLLTOP), 0) / (MAX_SCROLLTOP - MIN_SCROLLTOP)
            setBackground(opacity)
            toggleShadow(false)
        } else {
            if (oldScrollTop !== MAX_SCROLLTOP) {
                setBackground(1)
                toggleShadow(true)
            }
        }
        oldScrollTop = scrollTop
    }

    function setBackground(opacity) {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, '  + opacity + ')'
    }

    function toggleShadow(value) {
        if (value) {
            navbar.classList.add('is-shadow')
        } else {
            navbar.classList.remove('is-shadow')
        }
    }
}());
