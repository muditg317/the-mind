import {useEffect, useRef} from "react";

const noValue = Symbol("lazyRef.noValue");

const useLazyRef = <T>(getInitialValue: () => T, cleanup?: (obj: T) => void) => {
  const lazyRef = useRef<T | typeof noValue>(noValue);

  if (lazyRef.current === noValue) {
    lazyRef.current = getInitialValue();
  }

  useEffect(() => {
    return () => {
      if (cleanup && lazyRef.current !== noValue) {
        cleanup(lazyRef.current);
        lazyRef.current = noValue;
      }
    }
  }, [cleanup]);

  return lazyRef as React.MutableRefObject<T>;
};

export default useLazyRef;