import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCalendarAlt } from "@fortawesome/free-regular-svg-icons";
import {
  faArrowDown,
  faArrowRight,
  faBalanceScale,
  faCircleNotch,
  faEdit,
  faEnvelope,
  faExclamationCircle,
  faHome,
  faImages,
  faMusic,
  faPaperPlane,
  faPause,
  faPlay,
  faSearch,
  faSignInAlt,
  faUser,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon as FAIcon } from "@fortawesome/react-fontawesome";

const SOLID_ICONS: Record<string, IconDefinition> = {
  "arrow-down": faArrowDown,
  "arrow-right": faArrowRight,
  "balance-scale": faBalanceScale,
  "circle-notch": faCircleNotch,
  edit: faEdit,
  envelope: faEnvelope,
  "exclamation-circle": faExclamationCircle,
  home: faHome,
  images: faImages,
  music: faMusic,
  "paper-plane": faPaperPlane,
  pause: faPause,
  play: faPlay,
  search: faSearch,
  "sign-in-alt": faSignInAlt,
  user: faUser,
  video: faVideo,
};

const REGULAR_ICONS: Record<string, IconDefinition> = {
  "calendar-alt": faCalendarAlt,
};

const ICON_MAP: Record<string, Record<string, IconDefinition>> = {
  solid: SOLID_ICONS,
  regular: REGULAR_ICONS,
};

interface Props {
  iconType: string;
  styleType: "solid" | "regular";
}

export const FontAwesomeIcon = ({ iconType, styleType }: Props) => {
  const icon = ICON_MAP[styleType]?.[iconType];
  if (!icon) {
    return null;
  }
  return <FAIcon className="font-awesome inline-block fill-current leading-none" icon={icon} />;
};
