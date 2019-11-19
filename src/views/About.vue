<template>
  <v-container grid-list-xl fluid>
    <v-layout row wrap>
      <v-flex lg4 sm12 xs12>
        <v-card>
          <v-card-title>{{$t('nav.about')}}</v-card-title>
          <v-card-text>
            <p v-html="$t('about')"></p>
          </v-card-text>
        </v-card>
      </v-flex>

      <v-flex lg3 sm12 xs12>
        <v-card>
          <v-card-title>{{$t('supportUsAlipay')}}</v-card-title>
          <v-card-text>
            <v-img :src="require('@/assets/alipay.jpg')" />
          </v-card-text>
        </v-card>
      </v-flex>

      <v-flex lg3 sm12 xs12>
        <v-card>
          <v-card-title>{{$t('supportUsWeChat')}}</v-card-title>
          <v-card-text>
            <v-img :src="require('@/assets/wechat.jpg')" />
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>
