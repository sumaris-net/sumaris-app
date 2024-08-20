import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActiveCommentInterface, ActiveCommentTypeEnum, Comment } from '../comments/comments.component';

@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
})
export class CommentComponent implements OnInit {
  @Input() comment!: Comment;
  @Input() activeComment!: ActiveCommentInterface | null;
  @Input() replies!: Comment[];
  @Input() currentUserId!: number;
  @Input() parentId!: number | null;

  @Output()
  setActiveComment = new EventEmitter<ActiveCommentInterface | null>();
  @Output()
  deleteComment = new EventEmitter<number>();
  @Output()
  addComment = new EventEmitter<{ text: string; parentId: number | null }>();
  @Output()
  updateComment = new EventEmitter<{ text: string; commentId: number }>();

  createdAt: string = '';
  canReply: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;
  activeCommentType = ActiveCommentTypeEnum;
  replyId: number | null = null;

  ngOnInit(): void {
    const fiveMinutes = 300000;
    const timePassed = new Date().getMilliseconds() - new Date(this.comment.createdAt).getMilliseconds() > fiveMinutes;
    this.createdAt = new Date(this.comment.createdAt).toLocaleDateString();
    this.canReply = Boolean(this.currentUserId);
    this.canEdit = this.currentUserId === this.comment.userId && !timePassed;
    this.canDelete = this.currentUserId === this.comment.userId && !timePassed;
    this.replyId = this.parentId ? this.parentId : this.comment.id;
  }

  isReplying(): boolean {
    if (!this.activeComment) {
      return false;
    }
    return this.activeComment.id === this.comment.id && this.activeComment.type === this.activeCommentType.replying;
  }

  isEditing(): boolean {
    if (!this.activeComment) {
      return false;
    }
    return this.activeComment.id === this.comment.id && this.activeComment.type === 'editing';
  }
}
