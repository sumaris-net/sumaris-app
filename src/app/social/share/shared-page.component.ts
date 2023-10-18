import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { isNotNil, LocalSettingsService, Toasts } from '@sumaris-net/ngx-components';
import { ContextService } from '@app/shared/context.service';
import { SharedResourceUtils } from '@app/social/share/shared-resource.utils';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-shared-page',
  templateUrl: './shared-page.component.html',
  styleUrls: ['./shared-page.component.scss'],
})
export class SharedPage implements OnInit {
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private http: HttpClient,
    private settings: LocalSettingsService,
    private context: ContextService,
    private toast: ToastController,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.downloadData();
  }

  async downloadData() {
    await this.settings.ready();
    const peerUrl = this.settings.settings.peerUrl;
    const uuid = this.route.snapshot.paramMap.get('uuid');

    let res = null;
    try {
      res = await SharedResourceUtils.downloadByUuid(this.http, peerUrl, uuid);
    } catch (e) {
      this.loading = false;
      this.error = true;
      console.error(e);
      Toasts.show(this.toast, this.translate, {
        message: e.message,
        color: 'accent',
        position: 'top',
        duration: 0,
        showCloseButton: true,
      });
    }

    if (isNotNil(res)) {
      this.context.clipboard = res.content;
      this.navCtrl.navigateRoot(res.path, {
        queryParams: { ...res.queryParams, uuid },
      });
    }
  }
}
