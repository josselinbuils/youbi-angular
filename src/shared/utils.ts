export async function delay(duration: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, duration));
}

export const validate = {
  array(value: any): boolean {
    return Array.isArray(value) && value.length > 0;
  },
  string(value: any): boolean {
    return typeof value === 'string' && value.length > 0;
  },
};
