export function syncTableWidths(node: HTMLElement) {
let observer: ResizeObserver;

function sync() {
const sourceHeaders = Array.from(node.querySelectorAll('.source-head th'));
const targetHeaders = Array.from(node.querySelectorAll('.target-head th'));

sourceHeaders.forEach((th, i) => {
const target = targetHeaders[i] as HTMLElement;
if (target) {
const width = (th as HTMLElement).offsetWidth;
target.style.width = `${width}px`;
target.style.minWidth = `${width}px`;
target.style.maxWidth = `${width}px`;
}
});

const scrollContainer = node.querySelector('.scroll-body');
const headerWrap = node.querySelector('.header-wrap') as HTMLElement;
if (scrollContainer && headerWrap) {
    const scrollbarWidth = (scrollContainer as HTMLElement).offsetWidth - scrollContainer.clientWidth;
    headerWrap.style.paddingRight = `${scrollbarWidth}px`;
}
}

requestAnimationFrame(sync);

observer = new ResizeObserver(() => {
requestAnimationFrame(sync);
});

const source = node.querySelector('.source-head');
if (source) observer.observe(source);

const scrollBody = node.querySelector('.scroll-body');
if (scrollBody) observer.observe(scrollBody);

return {
destroy() {
observer.disconnect();
}
};
}
