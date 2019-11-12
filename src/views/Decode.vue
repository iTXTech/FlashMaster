<template>
  <v-container grid-list-xl fluid>
    <v-layout row wrap>
      <v-flex lg3 sm12 xs12>
        <v-card>
          <v-card-title>{{$t('partNumber')}}</v-card-title>
          <v-card-text>
            <v-text-field required class="pn"></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-btn text>{{$t("query")}}</v-btn>
            <v-btn text>{{$t("search")}}</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>

      <v-flex lg2 sm12 xs12>
        <v-card>
          <v-card-title>{{$t('vendor')}}</v-card-title>
          <v-card-text>
            <v-img :src="require('@/assets/micron.jpg')"/>
            <v-text-field required>美光</v-text-field>
          </v-card-text>
        </v-card>
      </v-flex>

      <v-flex lg2 sm12 xs12>
        <v-card>
          <v-card-text>
            <v-text-field required v-bind:label="$t('type')"></v-text-field>
            <v-text-field required v-bind:label="$t('density')"></v-text-field>
            <v-text-field required v-bind:label="$t('deviceWidth')"></v-text-field>
            <v-text-field required v-bind:label="$t('cellLevel')"></v-text-field>
          </v-card-text>
        </v-card>
      </v-flex>

      <v-flex lg2 sm12 xs12>
        <v-card>
          <v-card-text>
            <v-text-field required v-bind:label="$t('processNode')"></v-text-field>
            <v-text-field required v-bind:label="$t('generation')"></v-text-field>
            <v-checkbox disabled v-bind:label="$t('sync')"/>
            <v-checkbox disabled v-bind:label="$t('async')"/>
          </v-card-text>
        </v-card>
      </v-flex>

      <v-flex lg2 sm12 xs12>
        <v-card>
          <v-card-text>
            <v-text-field required v-bind:label="$t('ce')"></v-text-field>
            <v-text-field required v-bind:label="$t('ch')"></v-text-field>
            <v-text-field required v-bind:label="$t('die')"></v-text-field>
            <v-text-field required v-bind:label="$t('rb')"></v-text-field>
          </v-card-text>
        </v-card>
      </v-flex>

      <v-flex lg4 sm12 xs12>
        <v-card>
          <v-card-text>
            <v-text-field required v-bind:label="$t('voltage')"></v-text-field>
            <v-text-field required v-bind:label="$t('package')"></v-text-field>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>
<style>
.pn input {
  text-transform: uppercase;
}
</style>
<script>
</script>
