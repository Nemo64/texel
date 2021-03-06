import ReactModal, {Classes as ModalClasses} from 'react-modal';
import {parseMS} from "../src/util";
import css from "./modal.module.css";

if (typeof window !== 'undefined') {
  ReactModal.setAppElement('#__next');
}

interface ModalProps {
  isOpen: boolean,
  onRequestClose: () => void,
  children: any,
}

const overlayClassName: ModalClasses = {
  base: css.overlay,
  afterOpen: css.overlayOpen,
  beforeClose: css.overlayClosing,
};

const className: ModalClasses = {
  base: css.modal,
  afterOpen: css.modalOpen,
  beforeClose: css.modalClosing,
};

export function Modal({isOpen, onRequestClose, children}: ModalProps) {
  return (
    <ReactModal isOpen={isOpen}
                onRequestClose={onRequestClose}
                overlayClassName={overlayClassName}
                className={className}
                closeTimeoutMS={parseMS(css.hideDelay)}>
      {children}
      <button type="button" className={css.close} onClick={onRequestClose} aria-label="Close modal">
        &times;
      </button>
    </ReactModal>
  );
}
