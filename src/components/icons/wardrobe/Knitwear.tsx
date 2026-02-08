import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgKnitwear = (props: SvgProps) => (
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
      <Path d="M6 19H3c-.6 0-1-.4-1-1V6c0-1.1.8-2.3 1.9-2.6L8 2a4 4 0 0 0 8 0l4.1 1.4C21.2 3.7 22 4.9 22 6v12c0 .6-.4 1-1 1h-3" />
      <Path d="M18 8v13c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V8" />
      <Path d="m6 10 2 2 2-2 2 2 2-2 2 2 2-2M6 16l2 2 2-2 2 2 2-2 2 2 2-2" />
    </G>
  </Svg>
);
export default SvgKnitwear;
