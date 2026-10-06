import { useState } from "react";
import Icon from "../components/Icon";

// Password field with a show/hide toggle. Takes the same props as <input>.
export default function PasswordInput({ id, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-wrap">
      <input id={id} type={visible ? "text" : "password"} spellCheck={false} autoCapitalize="off" {...props} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        // Keep focus (and the caret) in the input when clicked with a mouse.
        onMouseDown={(e) => e.preventDefault()}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={id}
        title={visible ? "Hide password" : "Show password"}
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={18} />
      </button>
    </div>
  );
}
