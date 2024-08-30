import { Component, Input, OnInit } from '@angular/core';

import { CommentsService } from '../services/comments.service';
import { CommentInterface } from '../type/comment.interface';
import { ActiveCommentInterface } from '../type/activeComment.interface';

@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  providers: [CommentsService],
})
export class CommentsComponent implements OnInit {
  @Input() currentUserId!: string;

  comments: CommentInterface[] = [];
  activeComment: ActiveCommentInterface | null = null;
  numberOfComments: number = 0;

  constructor(private commentsService: CommentsService) {}

  ngOnInit(): void {
    this.commentsService.getComments().subscribe((comments) => {
      this.comments = comments;
      this.numberOfComments = comments.length;
    });
  }

  getRootComments(): CommentInterface[] {
    return this.comments.filter((comment) => comment.parentId === null);
  }

  updateComment({ text, commentId }: { text: string; commentId: string }): void {
    this.commentsService.updateComment(commentId, text).subscribe((updatedComment) => {
      this.comments = this.comments.map((comment) => {
        if (comment.id === commentId) {
          return updatedComment;
        }
        return comment;
      });

      this.activeComment = null;
    });
  }

  deleteComment(commentId: string): void {
    this.commentsService.deleteComment(commentId).subscribe(() => {
      this.comments = this.comments.filter((comment) => comment.id !== commentId);
    });
  }

  setActiveComment(activeComment: ActiveCommentInterface | null): void {
    this.activeComment = activeComment;
  }

  addComment({ text, parentId }: { text: string; parentId: string | null }): void {
    this.commentsService.createComment(text, parentId).subscribe((createdComment) => {
      this.comments = [...this.comments, createdComment];
      this.activeComment = null;
    });
  }

  getReplies(commentId: string): CommentInterface[] {
    return this.comments
      .filter((comment) => comment.parentId === commentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  getNumberOfComment() {
    return this.numberOfComments;
  }
}
