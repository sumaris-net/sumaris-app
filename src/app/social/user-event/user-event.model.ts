import {
  Entity,
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  EventLevel,
  FilterFn,
  fromDateISOString,
  IconRef,
  isNil,
  isNotEmptyArray,
  isNotNil,
  IUserEvent,
  IUserEventFilter,
  toDateISOString,
  IUserEventAction, isNotNilOrBlank
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import {StoreObject} from '@apollo/client/core';

export declare type UserEventType = 'FEED' | 'DEBUG_DATA' | 'INBOX_MESSAGE' | 'JOB';

export const UserEventTypeEnum = Object.freeze({
  FEED: <UserEventType>'FEED',
  DEBUG_DATA: <UserEventType>'DEBUG_DATA',
  INBOX_MESSAGE: <UserEventType>'INBOX_MESSAGE',
  JOB: <UserEventType>'JOB'
  // TODO: add all types of event
});

@EntityClass({ typename: 'UserEventVO' })
export class UserEvent extends Entity<UserEvent> implements IUserEvent<UserEvent> {
  static fromObject: (source: any, opts?: any) => UserEvent;

  type: string;
  level: EventLevel;
  issuer: string;
  recipient: string;
  creationDate: Moment;
  updateDate: Moment;

  message: string;
  hasContent: boolean;
  content: any;

  avatar: string;
  avatarIcon: IconRef;
  avatarJdenticon: any;
  icon: IconRef;

  readDate: Moment;
  readSignature: string;

  jobId: number;
  source: string;

  actions: IUserEventAction[];

  constructor() {
    super(UserEvent.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.creationDate = toDateISOString(this.creationDate);
    target.readDate = toDateISOString(this.readDate);

    // Serialize content
    if (typeof this.content === 'object') {
      target.content = JSON.stringify(this.content);
    }
    else {
      target.content = null;
    }
    target.hasContent = this.hasContent || isNotNilOrBlank(target.content);

    if (opts?.minify) {
      delete target.avatar;
      delete target.avatarIcon;
      delete target.icon;
      delete target.actions;
      delete target.hasContent;
    }

    // Pod
    if (opts?.keepLocalId === false) {
      delete target.jobId;
    }

    return target;
  }

  fromObject(source: any) {
    Object.assign(this, source); // Copy all properties
    super.fromObject(source);
    this.creationDate = fromDateISOString(source.creationDate);
    this.readDate = fromDateISOString(source.readDate);

    try {
      // Deserialize content
      if (typeof source.content === 'string' && source.content.startsWith('{')) {
        this.content = JSON.parse(source.content);
      }
    } catch (err) {
      console.error('Error during UserEvent deserialization', err);
      this.content = null;
    }

    this.hasContent = this.hasContent || !!this.content || false;
  }

  addAction(action: IUserEventAction) {
    if (!action) throw new Error(`Argument 'action' is required`);
    if (!action.name) throw new Error(`Argument 'action.name' is required`);
    if (!action.executeAction || typeof action.executeAction !== 'function') throw new Error(`Argument 'action.executeAction' is required, and should be a function`);
    this.actions = this.actions || [];
    this.actions.push(action);
  }

  addDefaultAction(action: Partial<IUserEventAction>) {
    this.addAction({executeAction: null, ...action,
      default: true,
      name: action.name || 'default',
      title: action.title || action.name
    });
  }
}

@EntityClass({ typename: 'UserEventFilterVO' })
export class UserEventFilter
  extends EntityFilter<UserEventFilter, UserEvent>
  implements IUserEventFilter<UserEvent> {
  static fromObject: (source: any, opts?: any) => UserEventFilter;

  types: string[] = [];
  levels: EventLevel[] = [];
  issuers: string[] = [];
  recipients: string[] = [];
  startDate: Moment = null;

  includedIds: number[] = [];
  excludeRead = false;

  jobId: number = null;
  source: string = null;

  constructor() {
    super(UserEventFilter.TYPENAME);
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.types = source.types || [];
    this.levels = source.levels || [];
    this.issuers = source.issuers || [];
    this.recipients = source.recipients || [];
    this.startDate = fromDateISOString(source.startDate);
    this.includedIds = source.includedIds || [];
    this.excludeRead = source.excludeRead || false;
    this.jobId = source.jobId;
    this.source = source.source;
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);

    target.source = target.source || (target.jobId && 'job:' + target.jobId) || undefined;

    // Pod
    if (opts?.keepLocalId === false) {
      delete target.jobId;
    }

    return target;
  }

  protected buildFilter(): FilterFn<UserEvent>[] {
    const filterFns = super.buildFilter();

    if (isNotEmptyArray(this.types)) {
     filterFns.push((t) => this.types.includes(t.type));
    }
    if (isNotEmptyArray(this.levels)) {
      filterFns.push((t) => this.levels.includes(t.level));
    }
    if (isNotEmptyArray(this.issuers)) {
      filterFns.push((t) => this.issuers.includes(t.issuer));
    }
    if (isNotEmptyArray(this.recipients)) {
      filterFns.push((t) => this.recipients.includes(t.recipient));
    }

    if (isNotNil(this.startDate)) {
      filterFns.push((t) => this.startDate.isSameOrBefore(t.creationDate));
    }
    if (isNotEmptyArray(this.includedIds)) {
      filterFns.push((t) => this.includedIds.includes(t.id));
    }
    if (this.excludeRead === true) {
      filterFns.push((t) => isNil(t.readDate));
    }
    if (isNotNil(this.jobId)) {
      filterFns.push(t => t.jobId === this.jobId);
    }
    if (isNotNil(this.source)) {
      filterFns.push(t => t.source === this.source);
    }

    return filterFns;
  }
}
