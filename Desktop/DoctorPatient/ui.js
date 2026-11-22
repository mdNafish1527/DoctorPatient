import React from 'react';
import { View, Text, TextInput, TouchableOpacity as T } from 'react-native';
export const c = { p:'#0E7C86', bg:'#F4F8FA', t:'#12262B', m:'#6B7F85', w:'#fff', ok:'#2E9E5B', err:'#D64545', ln:'#DCE6EA' };
export const Btn = ({ title, onPress, kind, dis }) => (
  <T disabled={dis} onPress={onPress} style={{ backgroundColor: kind === 'o' ? c.w : c.p, borderWidth:1, borderColor: kind === 'x' ? c.err : c.p, padding:14, borderRadius:12, alignItems:'center', opacity: dis ? 0.4 : 1, marginVertical:4 }}>
    <Text style={{ color: kind === 'o' ? c.p : kind === 'x' ? c.err : c.w, fontWeight:'700' }}>{title}</Text>
  </T>);
export const Card = ({ children, onPress, style }) => { const P = onPress ? T : View; return <P onPress={onPress} style={[{ backgroundColor:c.w, borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:c.ln }, style]}>{children}</P>; };
export const Chip = ({ label, on, onPress }) => (
  <T onPress={onPress} style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, marginRight:8, marginBottom:6, backgroundColor: on ? c.p : c.w, borderWidth:1, borderColor: on ? c.p : c.ln }}>
    <Text style={{ color: on ? c.w : c.t, fontWeight:'600' }}>{label}</Text>
  </T>);
export const Inp = p => <TextInput placeholderTextColor={c.m} {...p} style={[{ backgroundColor:c.w, borderWidth:1, borderColor:c.ln, borderRadius:12, padding:12, marginBottom:8, color:c.t }, p.style]} />;
export const H = ({ children, s }) => <Text style={[{ fontSize:18, fontWeight:'800', color:c.t, marginVertical:6 }, s]}>{children}</Text>;
export const Tx = ({ children, s, m }) => <Text style={[{ color: m ? c.m : c.t }, s]}>{children}</Text>;
export const Stars = ({ r, n }) => <Text style={{ color:'#F5A623', fontWeight:'700' }}>★ {r.toFixed(1)}{n ? <Text style={{ color:c.m, fontWeight:'400' }}> ({n})</Text> : null}</Text>;
