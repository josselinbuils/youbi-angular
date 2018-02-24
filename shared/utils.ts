export const validate = {
  array(value: any): boolean {
    return Array.isArray(value) && value.length > 0;
  },
  string(value: any): boolean {
    return typeof value === 'string' && value.length > 0;
  },
};
