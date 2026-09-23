import { computed, ref, Ref } from 'vue';
import { isUndefined } from 'lodash-es';

type Fn = (...args: any) => any;

export const useControlValue = <T>(
  modelValue: Ref<T | undefined>,
  defaultValue: T,
  onSet: Fn = (data: T) => data,
  onGet: Fn = (data: T) => data,
) => {
  const controlValue = ref<T>(defaultValue);
  return computed<T>({
    get() {
      const value = isUndefined(modelValue.value)
        ? controlValue.value
        : modelValue.value;
      return onGet(value);
    },
    set(value: T) {
      controlValue.value = value;
      onSet(value);
    },
  });
};

export default useControlValue;
