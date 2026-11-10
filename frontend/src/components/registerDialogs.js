import { registerDialog } from './dialogs.js';
import ActivityDialog from './ActivityDialog.jsx';
import ReorganizeDialog from './ReorganizeDialog.jsx';
import CloseDayDialog from './CloseDayDialog.jsx';

registerDialog('activity', ActivityDialog);
registerDialog('reorganize', ReorganizeDialog);
registerDialog('closeDay', CloseDayDialog);
