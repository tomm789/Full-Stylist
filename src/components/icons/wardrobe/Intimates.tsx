import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgIntimates = (props: SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={24}
    height={24}
    {...props}
  >
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M5 2v2a2 2 0 0 0-2 2v2c0 1.7 1.3 3 3 3h2a2 2 0 0 0 2-2h4a2 2 0 0 0 2 2h2c1.7 0 3-1.3 3-3V6a2 2 0 0 0-2-2" />
      <Path d="M10 9c0-2.8-2.2-5-5-5m14-2v2c-2.8 0-5 2.2-5 5M3 15a7 7 0 0 1 7 7h4a7 7 0 0 1 7-7Z" />
    </G>
  </Svg>
);
export default SvgIntimates;
