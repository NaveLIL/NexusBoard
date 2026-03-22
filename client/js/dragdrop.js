// drag & drop reordering within categories
let draggedCard = null;
let dragPlaceholder = null;

function initDragDrop() {
    const wrap = document.getElementById('services-wrap');
    if (!wrap) return;

    wrap.addEventListener('dragstart', onDragStart);
    wrap.addEventListener('dragend', onDragEnd);
    wrap.addEventListener('dragover', onDragOver);
    wrap.addEventListener('drop', onDrop);
}

function onDragStart(e) {
    const card = e.target.closest('.service-card');
    if (!card) return;
    draggedCard = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');

    // create placeholder
    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = 'drag-placeholder';
    dragPlaceholder.style.height = card.offsetHeight + 'px';
}

function onDragEnd(e) {
    if (draggedCard) draggedCard.classList.remove('dragging');
    if (dragPlaceholder?.parentNode) dragPlaceholder.remove();
    draggedCard = null;
    dragPlaceholder = null;
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedCard) return;

    const target = e.target.closest('.service-card');
    if (!target || target === draggedCard) return;

    // only within same grid (category)
    const grid = target.closest('.services-grid');
    if (!grid || !grid.contains(draggedCard)) return;

    const rect = target.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
        grid.insertBefore(dragPlaceholder, target);
        grid.insertBefore(draggedCard, target);
    } else {
        grid.insertBefore(dragPlaceholder, target.nextSibling);
        grid.insertBefore(draggedCard, target.nextSibling);
    }
}

function onDrop(e) {
    e.preventDefault();
    if (!draggedCard) return;

    const grid = draggedCard.closest('.services-grid');
    if (!grid) return;

    // save new order for all cards in this grid
    const cards = grid.querySelectorAll('.service-card');
    cards.forEach((card, idx) => {
        const id = card.dataset.serviceId;
        if (id) api.patch(`/services/${id}/order`, { sort_order: idx });
    });
}
