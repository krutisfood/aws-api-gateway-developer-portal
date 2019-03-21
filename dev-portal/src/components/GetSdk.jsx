// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { apiGatewayClient } from 'services/api'
import { store } from 'services/state'

import React from 'react'

import { Loader, Dropdown, Button, Header, Modal, Icon, Form } from 'semantic-ui-react'
import { modal } from 'components/Modal'

import {observer} from 'mobx-react'

/**
 * This button is used in the `InfoReplacement` component of the SwaggerUiLayout to add the GetSdkButton directly into the SwaggerUi UI.
 */
export const GetSdkButton = observer(() => {
  return (
    <span>
      <Dropdown as={Button} text='Download SDK' pointing className='link item'>
        <Dropdown.Menu>
          {sdkTypes.map((type) => {
            return <Dropdown.Item key={type.id} onClick={() => confirmDownload(type)}>
              {type.friendlyName}
            </Dropdown.Item>
          })}
        </Dropdown.Menu>
      </Dropdown>
      {store.api.downloadingSdk && <Loader active inline size="tiny" />}
    </span>
  )
})

function confirmDownload(type) {
  if (type.configurationProperties.length)
    modal.open(GetSdkModal, { type })
  else
    getSdk(type.id)
}

/**
 * This modal is included by the modals component, which also provides the default open/close controls for all modals.
 */
export class GetSdkModal extends React.Component {
  constructor(props) {
    super(props)

    this.state = props.type.configurationProperties.reduce((obj, property) => {
      if (property.required)
        obj[property.id] = null
      return obj
    }, {})
  }

  // this function returns a prop directly
  // it's intended to be used like <Component {...this.canSubmit()} />
  isDisabled = () => {
    let hasEmptyValue = !!Object.entries(this.state)
      .find(([key, value]) => !value)

    return { disabled: hasEmptyValue }
  }

  handleChange = (event, { id, value }) => this.setState({ [id]: value })

  handleSubmit = () => {
    modal.close()
    getSdk(this.props.type.id, JSON.stringify(this.state))
  }

  render() {
    const type = this.props.type

    return <>
      <Header icon='archive' content={`Download the ${type.friendlyName} SDK`} />
      <Modal.Content>
        <Form onSubmit={this.handleSubmit}>
          {type.configurationProperties.map(property => (
            // only display required fields for now
            property.required ? <Form.Input
              key={property.name}
              id={property.name}
              label={`${property.friendlyName} (required)`}
              placeholder={property.friendlyName}
              onChange={this.handleChange} /> : null
          ))}
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button basic color='red' onClick={modal.close}>
          <Icon name='remove' /> Cancel
      </Button>
        <Button color='green' {...this.isDisabled()} onClick={this.handleSubmit}>
          <Icon name='checkmark' /> Download
      </Button>
      </Modal.Actions>
    </>
  }
}

const sdkTypes = [
  {
    id: "android",
    friendlyName: "Android",
    description: "",
    configurationProperties: [
      {
        name: "groupId",
        friendlyName: "Group ID",
        description: "",
        required: true
      }, {
        name: "invokerPackage",
        friendlyName: "Invoker package",
        description: "",
        required: true
      }, {
        name: "artifactId",
        friendlyName: "Artifact ID",
        description: "",
        required: true
      }, {
        name: "artifactVersion",
        friendlyName: "Artifact version",
        description: "",
        required: true
      },
    ]
  },
  {
    id: "javascript",
    friendlyName: "JavaScript",
    description: "",
    configurationProperties: []
  },
  {
    id: "ios-objective-c",
    friendlyName: "iOS (Objective-C)",
    description: "",
    configurationProperties: [
      {
        name: "prefix",
        friendlyName: "Prefix",
        description: "",
        required: true
      },
    ]
  },
  {
    id: "ios-swift",
    friendlyName: "iOS (Swift)",
    description: "",
    configurationProperties: [
      {
        name: "prefix",
        friendlyName: "Prefix",
        description: "",
        required: true
      },
    ]
  },
  {
    id: "java",
    friendlyName: "Java SDK",
    description: "Java SDK generator for API Gateway APIs",
    configurationProperties: [
      {
        name: "service.name",
        friendlyName: "Service Name",
        description: "Name of the service which is used to derive the Java interface name for your client",
        required: true
      },
      {
        name: "java.package-name",
        friendlyName: "Java Package Name",
        description: "Name of the Java package your code will be generated under",
        required: true
      },
      {
        name: "java.build-system",
        friendlyName: "Java Build System",
        description: "Build system to setup for project; Currently supported: maven, gradle",
        required: false
      },
      {
        name: "java.group-id",
        friendlyName: "Java Group Id",
        description: "Group id for your Maven or Gradle project. Defaults to package name",
        required: false
      },
      {
        name: "java.artifact-id",
        friendlyName: "Java Artifact Id",
        description: "Artifact Id for your Maven project or project name for your Gradle project. Defaults to service name",
        required: false
      },
      {
        name: "java.artifact-version",
        friendlyName: "Java Artifact Version",
        description: "Version of your Maven or Gradle project. Defaults to 1.0-SNAPSHOT",
        required: false
      },
      {
        name: "java.license-text",
        friendlyName: "Source Code License Text",
        description: "Customer provided license to inject into source file headers",
        required: false
      }
    ]
  },
  {
    id: "ruby",
    friendlyName: "Ruby",
    description: "Ruby SDK generator for API Gateway APIs",
    configurationProperties: [
      {
        name: "service.name",
        friendlyName: "Service Name",
        description: "Name of the service which is used to derive the name for your client",
        required: true
      },
      {
        name: "ruby.gem-name",
        friendlyName: "Ruby Gem Name",
        description: "Name of the Ruby gem your code will be generated under",
        required: false
      },
      {
        name: "ruby.gem-version",
        friendlyName: "Ruby Gem Version",
        description: "Version number for your service gem. Defaults to 1.0.0",
        required: false
      }
    ]
  }
]

function getSdk(sdkType, parameters = "{}") {
  let apiId = store.api.id
  let stageName = store.api.stage

  store.api.downloadingSdk = true

  return apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.get(`/catalog/${apiId}_${stageName}/sdk`, { sdkType }, {}, {
      queryParams: { parameters },
      config: { responseType: "blob" }
    }))
    .then(({ data, ...rest }) => {
      console.log(rest)
      downloadFile(data)
    })
    .catch(() => {
    })
    .finally(() => {
      store.api.downloadingSdk = false
    })
}

function downloadFile(data, fileName = 'test.zip') {
  const reader = new FileReader()
  reader.onloadend = () => {
    const downloadLinkElement = document.createElement('a')
    console.log(reader.result)
    downloadLinkElement.setAttribute('href', reader.result)
    downloadLinkElement.setAttribute('download', fileName)
    downloadLinkElement.style.display = 'none'

    document.body.appendChild(downloadLinkElement)
    downloadLinkElement.click()
    document.body.removeChild(downloadLinkElement)
  }
  reader.readAsDataURL(data)

}