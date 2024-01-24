import {useRef} from "react";

const noValue = Symbol("lazyRef.noValue");

const useLazyRef = <T>(getInitialValue: () => T) => {
  const lazyRef = useRef<T | typeof noValue>(noValue);

  if (lazyRef.current === noValue) {
    lazyRef.current = getInitialValue();
  }

  return lazyRef as React.MutableRefObject<T>;
};

export default useLazyRef;