import { Component, Input, OnInit } from '@angular/core';

import { AccountService } from '@sumaris-net/ngx-components';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { UserEventFilter } from '@app/social/user-event/user-event.model';
import moment from 'moment';

export interface ActiveCommentInterface {
  id: number;
  type: ActiveCommentTypeEnum;
}
export enum ActiveCommentTypeEnum {
  replying = 'replying',
  editing = 'editing',
}
export interface CommentData {
  objectId: string;
  objectType: string;
  content: Comment[];
}
export interface Comment {
  id: number;
  body: string;
  username: string;
  userId: number;
  parentId: null | number;
  createdAt: string;
  pubkey: string;
}

@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
})
export class CommentsComponent implements OnInit {
  currentUserId!: number;

  @Input() objectType!: string;
  @Input() objectId!: string;

  comments: Comment[] = [];
  activeComment: ActiveCommentInterface | null = null;
  numberOfComments: number = 0;

  constructor(
    private userEventService: UserEventService,
    private accountService: AccountService
  ) {
    this.currentUserId = this.accountService.account.id;
  }

  async ngOnInit() {
    const filter: Partial<UserEventFilter> = { recipients: [this.objectType], source: this.objectId };
    console.log('filter', filter);

    const comments = await this.userEventService.loadComments(filter);
    this.comments = comments.content as Comment[];
    this.numberOfComments = this.comments.length;
  }

  getRootComments(): Comment[] {
    return this.comments.filter((comment) => comment.parentId === null).reverse();
  }

  updateComment({ text, commentId }: { text: string; commentId: number }): void {
    const updateComment = this.comments.find((comment) => comment.id === commentId);
    updateComment.body = text;

    const data: CommentData = {
      objectId: this.objectId,
      objectType: this.objectType,
      content: [...this.comments],
    };
    this.activeComment = null;
    this.userEventService.sendComment(data);
  }

  deleteComment(commentId: number): void {
    const comments = this.comments.filter((comment) => comment.id != commentId && comment.parentId != commentId);

    this.comments = comments;
    this.numberOfComments = this.comments.length;
    const data: CommentData = {
      objectId: this.objectId,
      objectType: this.objectType,
      content: [...comments],
    };
    this.userEventService.sendComment(data);
  }

  setActiveComment(activeComment: ActiveCommentInterface | null): void {
    this.activeComment = activeComment;
  }

  async addComment({ text, parentId }: { text: string; parentId: number | null }) {
    const newComment = this.createComment(text, parentId);
    newComment as Comment;
    this.comments = [...this.comments, newComment];
    this.activeComment = null;
    this.numberOfComments = this.comments.length;

    const data: CommentData = {
      objectId: this.objectId,
      objectType: this.objectType,
      content: [...this.comments],
    };
    this.userEventService.sendComment(data);
  }

  getReplies(commentId: number): Comment[] {
    return this.comments
      .filter((comment) => comment.parentId === commentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  getNumberOfComment() {
    return this.numberOfComments;
  }

  createComment(text: string, parentId: number | null = null) {
    const highestId = this.comments.reduce((maxId, comment) => {
      return comment.id > maxId ? comment.id : maxId;
    }, 0);

    return {
      id: highestId + 1,
      body: text,
      parentId,
      createdAt: moment().format('DD/MM/YY HH:mm').toString(),
      userId: this.accountService.account.id,
      username: this.accountService.account.lastName + ' ' + this.accountService.account.firstName,
      pubkey: this.accountService.account.pubkey,
    };
  }
}
