import ReactModal, {Classes} from 'react-modal';
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

const overlayClassName: Classes = {
  base: css.overlay,
  afterOpen: css.overlayOpen,
  beforeClose: css.overlayClosing,
}

const className: Classes = {
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
      <button type="button" className={css.close} onClick={onRequestClose}>&times;</button>
      {children}
    </ReactModal>
  );
}
