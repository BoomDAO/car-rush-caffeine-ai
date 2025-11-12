import type { IDL } from '@dfinity/candid';

export const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const ActionArg = IDL.Record({
    fields: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    actionId: IDL.Text,
  });
  
  return IDL.Service({
    processAction: IDL.Func([ActionArg], [], []),
  });
};
