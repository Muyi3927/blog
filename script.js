// 博客网站的JavaScript功能

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// 添加页面加载动画
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 10);
});

// 控制台输出欢迎信息
console.log('%c欢迎来到我的博客！', 'color: #3498db; font-size: 20px; font-weight: bold;');
console.log('%cWelcome to my blog!', 'color: #2ecc71; font-size: 16px;');
