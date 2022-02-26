import { Version } from "@microsoft/sp-core-library";
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
//<new>
import {
  ISPHttpClientOptions,
  SPHttpClientResponse,
  SPHttpClient,
} from "@microsoft/sp-http";
import { SPComponentLoader } from "@microsoft/sp-loader";
const viewer: any = require("./ForgeViewer.js");
export interface IGetSpListItemsWebPartProps {
  description: string;
}
export interface ISPLists {
  value: ISPList[];
}
export interface ISPList {
  File: {
    Name: string;
  };
  Urn: string;
}
import { Environment, EnvironmentType } from "@microsoft/sp-core-library";
//</new>
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";

import styles from "./ViewerWebpartWebPart.module.scss";
import * as strings from "ViewerWebpartWebPartStrings";

const CLIENT_ID = "";
const CLIENT_SECRET = "";

export interface IViewerWebpartWebPartProps {
  description: string;
  //<new>
  accessToken: string;
  //</new>
}

export default class ViewerWebpartWebPart extends BaseClientSideWebPart<IViewerWebpartWebPartProps> {
  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = "";

  protected onInit(): Promise<void> {
    this._environmentMessage = this._getEnvironmentMessage();

    return super.onInit();
  }

  //<new>
  private _getAccessToken(): void {
    SPComponentLoader.loadScript(
      "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"
    );

    const spOpts: ISPHttpClientOptions = {
      body: `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials&scope=viewables:read`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    this.context.httpClient
      .post(
        "https://developer.api.autodesk.com/authentication/v1/authenticate",
        SPHttpClient.configurations.v1,
        spOpts
      )
      .then(async (response: SPHttpClientResponse) => {
        response.json().then((responseJSON: JSON) => {
          let json: any = responseJSON;
          this.properties.accessToken = json.access_token;
        });
      });
  }

  private _getListData(): Promise<ISPLists> {
    return this.context.spHttpClient
      .get(
        this.context.pageContext.web.absoluteUrl +
          "/_api/web/lists/GetByTitle('Documents')/Items?$select=File/Name,Urn&$expand=File",
        SPHttpClient.configurations.v1
      )
      .then((response: SPHttpClientResponse) => {
        return response.json();
      });
  }
  private _renderListAsync(): void {
    if (
      Environment.type == EnvironmentType.SharePoint ||
      Environment.type == EnvironmentType.ClassicSharePoint
    ) {
      this._getListData().then((response) => {
        this._renderList(response.value);
      });
    }
  }
  private _renderList(items: ISPList[]): void {
    let html: string =
      '<table>';
    html += "<th>File Name</th><th>Urn</th>";
    items.forEach((item: ISPList) => {
      html += `
        <tr>            
          <td>${item.File.Name}</td>
          <td>${item.Urn ? item.Urn : ''}</td> 
        </tr>
      `;
    });
    html += "</table>";

    const listContainer: Element =
      this.domElement.querySelector("#spListContainer");
    listContainer.innerHTML = html;

    this.domElement.querySelectorAll("tr").forEach(tr => {
      tr.addEventListener("click", (e: Event) => {
        let trElem: any = e.currentTarget;
        let tdElems = trElem.querySelectorAll("td");
        let text: string = tdElems.item(1).textContent;
        console.log(text);
        if (text.substring(0, 2) === 'dX') {
          viewer.launchViewer(
            text,
            null,
            this.properties.accessToken
          );
        } else {
          console.log('File not translated yet');
        }
      });
    });
  }
  //</new>

  public render(): void {
    this._getAccessToken();
    this.domElement.innerHTML = `
    <section class="${styles.viewerWebpart} ${
      !!this.context.sdks.microsoftTeams ? styles.teams : ""
    }">
      <link rel="stylesheet" href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css" type="text/css">
      <div id="spListContainer" class="${styles.documentsList}"></div>
      <div id="forgeViewer" class="${styles.forgeViewer}"></div>
    </section>`;
    this._renderListAsync();
  }

  private _getEnvironmentMessage(): string {
    if (!!this.context.sdks.microsoftTeams) {
      // running in Teams
      return this.context.isServedFromLocalhost
        ? strings.AppLocalEnvironmentTeams
        : strings.AppTeamsTabEnvironment;
    }

    return this.context.isServedFromLocalhost
      ? strings.AppLocalEnvironmentSharePoint
      : strings.AppSharePointEnvironment;
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;
    this.domElement.style.setProperty("--bodyText", semanticColors.bodyText);
    this.domElement.style.setProperty("--link", semanticColors.link);
    this.domElement.style.setProperty(
      "--linkHovered",
      semanticColors.linkHovered
    );
  }

  protected get dataVersion(): Version {
    return Version.parse("1.0");
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField("description", {
                  label: strings.DescriptionFieldLabel,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
