import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
export const setStorage = (key: string, value: any) => {
  if (ExecutionEnvironment.canUseDOM) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const getStorage = (key: string) => {
  if (!ExecutionEnvironment.canUseDOM) {
    return undefined
  }
  const val = localStorage.getItem(key)
  if (!val) {
    return undefined
  }
  return JSON.parse(localStorage.getItem(key));
};