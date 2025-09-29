document.addEventListener('DOMContentLoaded', function() {
  const loadHTML = (selector, url) => {
    const element = document.querySelector(selector);
    if (element) {
      fetch(url)
        .then(response => response.ok ? response.text() : Promise.reject('File not found'))
        .then(data => {
          element.innerHTML = data;
          if (window.auth && typeof window.auth.initialize === 'function') {
            window.auth.initialize();
          }
        })
        .catch(error => console.error(`Error loading ${url}:`, error));
    }
  };

  loadHTML('body > header:first-of-type', '/gold/templates/_header.html');
  // Si tienes un footer, crea el archivo templates/_footer.html y descomenta la siguiente línea
  // loadHTML('body > footer:first-of-type', '/gold/templates/_footer.html'); 
});
