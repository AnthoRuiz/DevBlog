// Single owner of document.title: pages set the base title, the admin review counter adds a
// "(N) " prefix so pending reviews are visible from other browser tabs.
let baseTitle = typeof document !== 'undefined' ? document.title : '';
let badge = 0;

function apply() {
  document.title = badge > 0 ? `(${badge}) ${baseTitle}` : baseTitle;
}

export function setPageTitle(title: string) {
  baseTitle = title;
  apply();
}

export function setTitleBadge(count: number) {
  badge = count;
  apply();
}
