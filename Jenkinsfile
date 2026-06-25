automata {
  def versao = '1.0.0'
  // Parâmetros gerais
  def artifactId = 'wallet-sdk'
  def groupId = 'br.gov.dataprev.inji'

  // Parâmetros gerais
  type = 'CUSTOM'
  descriptor = "groupId=${groupId},artifactId=${artifactId},version=${versao}"

  qa.sonarOpts = "-Dsonar.projectKey=${groupId} -Dsonar.projectVersion=${versao} -Dsonar.sources=."
  qa.encoding = 'UTF-8'

  notifications.add type: 'mail', condition: 'unstable, failure, promotion', to: 'alexandre.dekker@dataprev.gov.br'

  artifacts.add([file: "${artifactId}-${versao}.tgz", descriptor: "groupId=${groupId},artifactId=${artifactId},version=${versao}"])

  build.agent.image = env.CUSTOM_IMAGE
  build.agent.args = "--group-add 1002 -v /var/run/docker.sock:/var/run/docker.sock -e HOME=/tmp -e DOCKER_BUILDKIT=0"

  build.script = {
    docker.withRegistry('https://registry.ctn.prevnet', 'harbor') {
      docker.image('redhat/nodejs-10:1-95').inside('-e NPM_CONFIG_PREFIX=/tmp -e HOME=/tmp -e NODE_TLS_REJECT_UNAUTHORIZED=0') {
            sh '''\
            npm set strict-ssl false && \
            git config --global http.sslverify false && \
            npm install && \
            npm pack'''
      }
    }
  }
}
