function initSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    let debounce = null;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => filterServices(input.value.trim()), 150);
    });
}
