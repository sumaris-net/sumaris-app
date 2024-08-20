import { Component, Input, OnInit } from '@angular/core';

import { AccountService } from '@sumaris-net/ngx-components';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { UserEventFilter } from '@app/social/user-event/user-event.model';

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
    const filter: Partial<UserEventFilter> = { recipients: ['ACTIVITY_CALENDAR'], source: '1' };
    await this.userEventService.watchAll(0, 10, 'createdAt', 'desc', filter, { withContent: true }).subscribe((data) => {
      this.comments = data.data[0].content.content as Comment[];
      this.numberOfComments = this.comments.length;
      console.log(data.data[0].content.content);
    });

    // this.commentsService.getComments().subscribe((comments) => {
    //   this.comments = comments;
    //   this.numberOfComments = comments.length;
    // });
    // console.log('comment component', this.accountService.account);
  }

  getRootComments(): Comment[] {
    return this.comments.filter((comment) => comment.parentId === null);
  }

  updateComment({ text, commentId }: { text: string; commentId: number }): void {
    const updateComment = this.comments.find((comment) => comment.id === commentId);
    updateComment.body = text;

    const data: CommentData = {
      objectId: '1',
      objectType: 'ACTIVITY_CALENDAR',
      content: [...this.comments],
    };
    this.activeComment = null;
    this.userEventService.sendComment(data);
  }

  deleteComment(commentId: number): void {
    const comments = this.comments.filter((comment) => comment.id != commentId);
    this.comments = comments;
    this.numberOfComments = this.comments.length;
    const data: CommentData = {
      objectId: '1',
      objectType: 'ACTIVITY_CALENDAR',
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
      objectId: '1',
      objectType: 'ACTIVITY_CALENDAR',
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
      createdAt: new Date().toISOString(),
      userId: this.accountService.account.id,
      username: this.accountService.account.lastName,
      pubkey: this.accountService.account.pubkey,
    };
  }
}
