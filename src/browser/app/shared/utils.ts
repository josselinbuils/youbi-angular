/**
 * Gets the first element that matches the selector by testing the element itself and traversing up through its
 * ancestors in the DOM tree.
 *
 * @see {@link https://api.jquery.com/closest|jQuery documentation}
 *
 * @param element Element to check first
 * @param selector Selector to find
 * @returns Element if found, undefined otherwise
 */
export function closest(element: HTMLElement, selector: string): HTMLElement {
  do {
    if ((<any> element).matches(selector)) {
      return element;
    }

    element = element.parentElement;

  } while (element instanceof HTMLElement);

  return undefined;
}

export function computeItemSize(containerWidth: number, itemMargin: number, preferredItemWidth: number, minItemsByRow: number,
                                maxItemsByRow: number): { itemsByLine: number; itemSize: number; lineWidth: number } {

  const dWidths: number[] = [];
  let itemsByLine: number;
  let itemSize: number;
  let lineWidth: number;

  for (let i = minItemsByRow; i <= maxItemsByRow; i++) {
    const width = Math.floor((containerWidth - (i + 1) * itemMargin) / i);

    dWidths[i] = Math.abs(width - preferredItemWidth);

    if (i === minItemsByRow || (width > 0 && dWidths[i] < dWidths[i - 1])) {
      itemSize = width;
      itemsByLine = i;
      lineWidth = width * i + (i - 1) * itemMargin;
    }
  }

  return { itemsByLine, itemSize, lineWidth };
}

export function groupBy(array: Array<any>, key: string): { [key: string]: any } {
  return array.reduce((map, item) => {
    if (map[item[key]] === undefined) {
      map[item[key]] = [];
    }
    map[item[key]].push(item);
    return map;
  }, {});
}
