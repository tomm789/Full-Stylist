import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgSleepwearLoungewear = (props: SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 256 256"
    width={24}
    height={24}
    {...props}
  >
    <Path d="M208 72H24V48a8 8 0 0 0-16 0v160a8 8 0 0 0 16 0v-32h208v32a8 8 0 0 0 16 0v-96a40 40 0 0 0-40-40M24 88h72v72H24Zm88 72V88h96a24 24 0 0 1 24 24v48Z" />
  </Svg>
);
export default SvgSleepwearLoungewear;
